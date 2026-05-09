# Slack.psm1 — minimal Slack chat.postMessage wrapper with soft rate limit.

$script:SlackState = @{
    Buckets = @{}    # channel -> [datetime[]] of recent send timestamps
}

function Send-SlackMessage {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [hashtable] $Slack,        # the .Slack hashtable from config
        [Parameter(Mandatory)] [string]    $Channel,      # 'status' | 'memory' | a literal channel id
        [Parameter(Mandatory)] [string]    $Text,
        [string] $Severity = 'info'                       # info | warn | error — emoji prefix
    )

    $channelId = switch ($Channel) {
        'status' { $Slack.StatusChannel }
        'memory' { $Slack.MemoryChannel }
        default  { $Channel }
    }
    if (-not $channelId -or $channelId -like '*FILL_ME*') {
        Write-Verbose "Slack channel for '$Channel' is not configured — skipping."
        return
    }

    $emoji = switch ($Severity) {
        'warn'  { ':warning: ' }
        'error' { ':rotating_light: ' }
        default { '' }
    }

    # Soft rate limit per channel
    $now = Get-Date
    if (-not $script:SlackState.Buckets.ContainsKey($channelId)) {
        $script:SlackState.Buckets[$channelId] = New-Object System.Collections.ArrayList
    }
    $bucket = $script:SlackState.Buckets[$channelId]
    # drop entries older than 60s
    while ($bucket.Count -gt 0 -and ($now - [datetime]$bucket[0]).TotalSeconds -gt 60) {
        $bucket.RemoveAt(0)
    }
    if ($bucket.Count -ge $Slack.MaxMessagesPerMinute) {
        Write-Verbose "Slack rate limit hit for $channelId; dropping message."
        return
    }
    [void]$bucket.Add($now)

    $body = @{
        channel = $channelId
        text    = "$emoji$Text"
    } | ConvertTo-Json -Compress -Depth 4

    try {
        $resp = Invoke-RestMethod -Method Post `
            -Uri 'https://slack.com/api/chat.postMessage' `
            -Headers @{ Authorization = "Bearer $($Slack.BotToken)"; 'Content-type' = 'application/json; charset=utf-8' } `
            -Body $body -TimeoutSec 10
        if (-not $resp.ok) {
            Write-Warning "Slack rejected message: $($resp.error)"
        }
    } catch {
        Write-Warning "Slack post failed: $_"
    }
}

Export-ModuleMember -Function Send-SlackMessage
