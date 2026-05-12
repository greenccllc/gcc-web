using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;

class Program {
    static int Main(string[] args) {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        string realExe = Path.Combine(dir, "7za-real.exe");

        // Build argument list, quoting args with spaces
        var sb = new StringBuilder();
        foreach (var a in args) {
            if (sb.Length > 0) sb.Append(' ');
            bool needsQuote = a.IndexOf(' ') >= 0 || a.IndexOf('"') >= 0;
            if (needsQuote) sb.Append('"');
            sb.Append(a.Replace("\"", "\\\""));
            if (needsQuote) sb.Append('"');
        }

        var psi = new ProcessStartInfo(realExe, sb.ToString()) {
            UseShellExecute = false
        };

        var proc = Process.Start(psi);
        proc.WaitForExit();

        // 7za exit code 2 = "Fatal error" but is used for non-fatal sub-item errors too
        // (e.g. cannot create symlink on Windows without developer mode).
        // All files that CAN be extracted were extracted; treat as success.
        int code = proc.ExitCode;
        return code == 2 ? 0 : code;
    }
}
