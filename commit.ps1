$commitMessage = @"
refactor(auth): synchronize DTOs and standardize token generation pipeline

- Implemented bcrypt password hashing and verification in IdentityService.
- Standardized HttpCode responses (200 OK) for Auth Controller endpoints (login, logout, refresh).
- Adjusted Gateway token generation to properly extract user metadata from IdentityService RPC responses.
- Configured Redis client to accept self-signed certificates for local development.
- Added necessary authentication packages (passport, bcrypt, cookie-parser) to dependencies.
"@

# Write message to temp file to preserve formatting
$tempFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tempFile, $commitMessage)

# Add all files
git add .

# Restore excluded files
git restore --staged tasks AGENTS.md project_documentation.md provider_module_plan.md push-db.ps1 seed-roles.js commit.ps1

# Commit using the temp file
git commit -F $tempFile

# Clean up
Remove-Item $tempFile
