#!/bin/bash

# Add cron job for nameserver monitoring (runs every 30 minutes)
CRON_JOB="*/30 * * * * cd /www/wwwroot/wpsystem && /usr/bin/node --loader ts-node/esm scripts/check-nameservers.ts >> /var/log/ns-monitor.log 2>&1"

# Check if cron job already exists
(crontab -l 2>/dev/null | grep -F "check-nameservers.ts") || (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job installed: NS monitoring every 30 minutes"
