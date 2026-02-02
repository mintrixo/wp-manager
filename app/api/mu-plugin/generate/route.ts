import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { domain } = await req.json()

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Find the site in database to get siteId
    const site = await prisma.site.findFirst({
      where: { domain }
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

    const pluginCode = `<?php
/**
 * Plugin Name: WP Manager Integration
 * Description: Connects WordPress with WP Manager system for centralized management
 * Version: 2.0.0
 * Author: WP Manager
 */

if (!defined('ABSPATH')) {
    exit;
}

class WPManager_Integration {
    private $api_url = '${API_URL}';
    private $site_id = ${site.id};
    private $domain = '${domain}';

    public function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
        add_action('init', [$this, 'check_magic_login']);
        add_action('wp_footer', [$this, 'add_footer_branding']);
    }

    public function register_routes() {
        // Verify magic login endpoint
        register_rest_route('wpmanager/v1', '/verify-login', [
            'methods' => 'GET',
            'callback' => [$this, 'verify_magic_login'],
            'permission_callback' => '__return_true'
        ]);

        // Site info endpoint
        register_rest_route('wpmanager/v1', '/site-info', [
            'methods' => 'GET',
            'callback' => [$this, 'get_site_info'],
            'permission_callback' => '__return_true'
        ]);

        // Heartbeat endpoint
        register_rest_route('wpmanager/v1', '/heartbeat', [
            'methods' => 'GET',
            'callback' => [$this, 'heartbeat'],
            'permission_callback' => '__return_true'
        ]);
    }

    public function verify_magic_login($request) {
        $token = $request->get_param('token');

        if (empty($token)) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'Token is required'
            ], 400);
        }

        // Verify token with backend
        $response = wp_remote_get($this->api_url . '/api/sites/magic-login?token=' . $token . '&siteId=' . $this->site_id);

        if (is_wp_error($response)) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'Failed to verify token with backend'
            ], 500);
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        if (!isset($body['valid']) || !$body['valid']) {
            return new WP_REST_Response([
                'success' => false,
                'error' => $body['error'] ?? 'Invalid or expired token'
            ], 401);
        }

        // Get admin user (ID 1 or first administrator)
        $admin_user = get_user_by('ID', 1);
        if (!$admin_user) {
            $admins = get_users(['role' => 'administrator', 'number' => 1]);
            if (!empty($admins)) {
                $admin_user = $admins[0];
            }
        }

        if (!$admin_user) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'No administrator user found'
            ], 500);
        }

        // Log the user in
        wp_set_current_user($admin_user->ID);
        wp_set_auth_cookie($admin_user->ID, true);
        do_action('wp_login', $admin_user->user_login, $admin_user);

        // Redirect to admin dashboard
        wp_redirect(admin_url());
        exit;
    }

    public function check_magic_login() {
        if (isset($_GET['wpmanager_token']) && !is_user_logged_in()) {
            $token = sanitize_text_field($_GET['wpmanager_token']);
            
            // Verify with backend
            $response = wp_remote_get($this->api_url . '/api/sites/magic-login?token=' . $token . '&siteId=' . $this->site_id);
            
            if (!is_wp_error($response)) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                
                if (isset($body['valid']) && $body['valid']) {
                    $admin_user = get_user_by('ID', 1);
                    if (!$admin_user) {
                        $admins = get_users(['role' => 'administrator', 'number' => 1]);
                        if (!empty($admins)) {
                            $admin_user = $admins[0];
                        }
                    }
                    
                    if ($admin_user) {
                        wp_set_current_user($admin_user->ID);
                        wp_set_auth_cookie($admin_user->ID, true);
                        do_action('wp_login', $admin_user->user_login, $admin_user);
                        wp_redirect(admin_url());
                        exit;
                    }
                }
            }
        }
    }

    public function get_site_info() {
        global $wp_version;

        $theme = wp_get_theme();
        $plugins = get_plugins();
        $active_plugins = get_option('active_plugins');

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'domain' => $this->domain,
                'wp_version' => $wp_version,
                'php_version' => phpversion(),
                'theme' => [
                    'name' => $theme->get('Name'),
                    'version' => $theme->get('Version')
                ],
                'plugins' => count($plugins),
                'active_plugins' => count($active_plugins),
                'users' => count_users()['total_users'],
                'posts' => wp_count_posts()->publish,
                'pages' => wp_count_posts('page')->publish
            ]
        ]);
    }

    public function heartbeat() {
        return new WP_REST_Response([
            'success' => true,
            'timestamp' => current_time('timestamp'),
            'site_id' => $this->site_id,
            'domain' => $this->domain,
            'status' => 'online'
        ]);
    }

    public function add_footer_branding() {
        if (is_user_logged_in() && current_user_can('manage_options')) {
            echo '<div style="position:fixed;bottom:10px;right:10px;background:#667eea;color:white;padding:8px 15px;border-radius:5px;font-size:12px;z-index:9999;box-shadow:0 2px 10px rgba(0,0,0,0.2);">
                Managed by <strong>WP-System</strong>
            </div>';
        }
    }
}

new WPManager_Integration();
`;

    return NextResponse.json({
      success: true,
      plugin: pluginCode,
      filename: `wpmanager-integration-${site.id}.php`
    })
  } catch (error: any) {
    console.error('[Generate MU Plugin] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
