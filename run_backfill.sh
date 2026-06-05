#!/bin/bash
cd /home/runner/workspace/artifacts/api-server
exec pnpm run backfill:explore
