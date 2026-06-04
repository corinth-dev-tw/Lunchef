#!/bin/bash
# Cloudflare DNS Setup Script for Lunchef
# Requires: CF_API_TOKEN with "Zone:Edit" permission for antu-technology.com

set -e

ZONE_ID="3ed0d80a5dd3a048ad625be5be68f0b1"

if [ -z "$CF_API_TOKEN" ]; then
  echo "Error: Please set the CF_API_TOKEN environment variable."
  echo "Create a token at: https://dash.cloudflare.com/profile/api-tokens"
  echo "Required permission: Zone > DNS > Edit (for antu-technology.com)"
  exit 1
fi

echo "Setting up DNS records for antu-technology.com..."

# 1. app.lunchef -> lunchef-app.pages.dev
echo "Adding CNAME: app.lunchef -> lunchef-app.pages.dev"
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "app.lunchef",
    "content": "lunchef-app.pages.dev",
    "ttl": 1,
    "proxied": true
  }' | jq -r '.success // .errors[0].message'

# 2. dashboard.lunchef -> lunchef-dashboard.pages.dev
echo "Adding CNAME: dashboard.lunchef -> lunchef-dashboard.pages.dev"
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "dashboard.lunchef",
    "content": "lunchef-dashboard.pages.dev",
    "ttl": 1,
    "proxied": true
  }' | jq -r '.success // .errors[0].message'

echo "Done. DNS records should propagate within a few minutes."
echo ""
echo "Next steps:"
echo "  1. Wait 1-2 minutes for DNS propagation"
echo "  2. Check: dig app.lunchef.antu-technology.com +short"
echo "  3. Check: dig dashboard.lunchef.antu-technology.com +short"
