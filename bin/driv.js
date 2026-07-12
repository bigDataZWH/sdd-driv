#!/usr/bin/env node
import('../dist/cli/index.js').then(m => m.main()).catch(err => { console.error(err); process.exit(1); });
