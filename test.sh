#!/bin/bash

# Test script for TBVH TEE Core
# Run the server first: PHALA_API_KEY=xxx npm run dev

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "=== Testing TBVH TEE Core ==="
echo ""

# 1. Health check
echo "1. Health check..."
curl -s "$BASE_URL/health" | jq .
echo ""

# 2. Create a negotiation session
echo "2. Creating negotiation session..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/negotiate" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_requirement": "I need actionable intelligence on upcoming tech earnings that could move the market. Looking for specific, time-sensitive information with verifiable source.",
    "seller_info": "I have confirmed information from a reliable source inside a major tech company. Q4 earnings will significantly beat analyst expectations by 15-20%. The earnings call is in 3 days.",
    "seller_proof": "My source is a senior finance employee who has access to preliminary numbers. I have been accurate on 4 of my last 5 tips in this sector.",
    "max_payment": 500
  }')

echo "$SESSION_RESPONSE" | jq .
SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.session_id')
echo ""

if [ "$SESSION_ID" = "null" ]; then
  echo "Failed to create session"
  exit 1
fi

# 3. Stream the negotiation
echo "3. Streaming negotiation (session: $SESSION_ID)..."
echo "   Press Ctrl+C to stop watching"
echo ""
curl -N "$BASE_URL/negotiate/$SESSION_ID/stream"
echo ""
echo ""

# 4. Check final status
echo "4. Final session status..."
curl -s "$BASE_URL/negotiate/$SESSION_ID" | jq .
