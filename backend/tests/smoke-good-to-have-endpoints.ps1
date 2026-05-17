$ErrorActionPreference = "Stop"

$base = "http://localhost:5050"

Write-Host "Testing GrantPilot good-to-have endpoints..." -ForegroundColor Cyan

Write-Host "`n1. Capabilities"
Invoke-RestMethod "$base/api/grantpilot/capabilities" | Format-List

Write-Host "`n2. Dataset status"
Invoke-RestMethod "$base/api/grantpilot/dataset/status" | Format-List

Write-Host "`n3. Grant facets"
Invoke-RestMethod "$base/api/grantpilot/grants/facets" | Format-List

Write-Host "`n4. Lookup multiple grants"
$lookupBody = @'
{
  "ids": ["grantsgov_351567", "mfh_12979"]
}
'@
Invoke-RestMethod `
  -Uri "$base/api/grantpilot/grants/lookup" `
  -Method POST `
  -ContentType "application/json" `
  -Body $lookupBody | Format-List

Write-Host "`n5. Related grants"
Invoke-RestMethod "$base/api/grantpilot/grants/grantsgov_351567/related?limit=5" | Format-List

Write-Host "`n6. Intake validation"
$validateBody = @'
{
  "project_description": "Clare County has a broken bridge causing flooding and commute delays. Estimated cost is $100,000."
}
'@
Invoke-RestMethod `
  -Uri "$base/api/grantpilot/intake/validate" `
  -Method POST `
  -ContentType "application/json" `
  -Body $validateBody | Format-List

Write-Host "`n7. Demo scenarios"
Invoke-RestMethod "$base/api/grantpilot/demo/scenarios" | Format-List

Write-Host "`n8. Compare grants"
$compareBody = @'
{
  "grant_ids": ["grantsgov_351567", "mfh_12979", "grantsgov_361291"],
  "project_profile": {
    "applicant_type": "County governments",
    "county": "Clare County",
    "project_category": "transportation",
    "project_stage": "construction",
    "description": "Bridge repair causing flooding and commute delays",
    "estimated_cost": 100000,
    "match_available": false,
    "documents_available": ["photos"],
    "impact_keywords": ["bridge", "flood", "transportation", "safety"]
  }
}
'@
Invoke-RestMethod `
  -Uri "$base/api/grantpilot/grants/compare" `
  -Method POST `
  -ContentType "application/json" `
  -Body $compareBody | Format-List

Write-Host "`n9. Feedback"
$feedbackBody = @'
{
  "rating": "positive",
  "page": "smoke-test",
  "message": "Good-to-have endpoint smoke test completed."
}
'@
Invoke-RestMethod `
  -Uri "$base/api/grantpilot/feedback" `
  -Method POST `
  -ContentType "application/json" `
  -Body $feedbackBody | Format-List

Write-Host "`n10. Trace summary"
$runBody = @'
{
  "project_description": "Clare County has a broken bridge causing flooding and commute delays. The county wants funding to repair the bridge. Estimated cost is $100,000 and no match is available."
}
'@
$response = Invoke-RestMethod `
  -Uri "$base/api/grantpilot/run" `
  -Method POST `
  -ContentType "application/json" `
  -Body $runBody

Write-Host "Created trace: $($response.trace_id)"
Invoke-RestMethod "$base/api/grantpilot/traces/$($response.trace_id)/summary" | Format-List

Write-Host "`nAll good-to-have endpoint smoke tests completed." -ForegroundColor Green
