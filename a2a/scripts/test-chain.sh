#!/bin/bash
# Quick test: register agents and execute a chain
BASE=http://localhost:3000

echo "Testing A2A Platform..."
echo ""

# Health check
echo "1. Platform health:"
curl -s $BASE/health | python3 -m json.tool

# Register agents
echo ""
echo "2. Registering Research Agent:"
curl -s -X POST $BASE/api/agents/register \
  -H Content-Type:application/json \
  -d "{"agentCard":{"id":"research-001","name":"Research Agent","framework":"adk","version":"1.0.0","capabilities":[],"inputSchema":{},"outputSchema":{},"endpoint":"http://localhost:8081","healthEndpoint":"http://localhost:8081/health","metadata":{},"tags":["research"]},"endpoint":"http://localhost:8081"}" | python3 -m json.tool

# List agents
echo ""
echo "3. Registered agents:"
curl -s $BASE/api/agents | python3 -m json.tool

# Execute chain
echo ""
echo "4. Executing single-agent chain:"
curl -s -X POST $BASE/api/chains/execute \
  -H Content-Type:application/json \
  -d "{"steps":[{"agentId":"research-001","name":"Research"}],"input":{"topic":"AI agents 2025"},"context":{}}" | python3 -m json.tool

echo ""
echo "Test complete!"
