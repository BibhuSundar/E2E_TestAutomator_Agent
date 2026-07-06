"""
Playwright Script Executor Tool
Executes Playwright test scripts and returns the results.
"""
import os
import json
import subprocess
import tempfile
from pathlib import Path
from crewai.tools import tool


@tool("Execute Playwright Script")
def execute_playwright_script(script: str, browser: str = "chromium") -> str:
    """
    Execute a Playwright test script and return the test results.
    
    Args:
        script: The full Playwright test script content (JavaScript/TypeScript with test() blocks).
        browser: Target browser - "chromium", "firefox", or "webkit" (default: "chromium").
    
    Returns:
        A formatted string with test results including pass/fail status, errors, and duration.
    """
    with tempfile.TemporaryDirectory(prefix="pw_exec_") as tmp_dir:
        tmp_path = Path(tmp_dir)

        # Detect script type and write appropriately
        script_path = tmp_path / "test.spec.js"

        # If the script doesn't have test imports, wrap it
        if "import { test" not in script and "const { test" not in script:
            wrapped = (
                "const { test, expect } = require('@playwright/test');\n\n"
                f"{script}\n"
            )
            script_path.write_text(wrapped, encoding="utf-8")
        else:
            script_path.write_text(script, encoding="utf-8")

        # Create a minimal playwright config
        config = {
            "testDir": ".",
            "timeout": 60000,
            "expect": {"timeout": 10000},
            "use": {
                "headless": True,
                "viewport": {"width": 1280, "height": 720},
                "ignoreHTTPSErrors": True,
            },
            "projects": [
                {
                    "name": browser.capitalize(),
                    "use": {"browserName": browser.lower()},
                }
            ],
            "reporter": [["json", {"outputFile": "results.json"}]],
        }
        config_path = tmp_path / "playwright.config.js"
        config_path.write_text(f"module.exports = {json.dumps(config, indent=2)};", encoding="utf-8")

        # Install deps (silent)
        subprocess.run(["npm", "init", "-y"], cwd=tmp_path, capture_output=True, timeout=30000)
        subprocess.run(
            ["npm", "install", "@playwright/test"],
            cwd=tmp_path,
            capture_output=True,
            timeout=60000,
        )

        result = subprocess.run(
            ["npx", "playwright", "test", str(script_path.name)],
            cwd=tmp_path,
            capture_output=True,
            text=True,
            timeout=120000,
        )

        stdout = result.stdout
        stderr = result.stderr
        exit_code = result.returncode

        # Try to parse JSON results
        summary = ""
        results_file = tmp_path / "results.json"
        if results_file.exists():
            try:
                data = json.loads(results_file.read_text(encoding="utf-8"))
                suites = data.get("suites", [])
                total = data.get("stats", {}).get("expected", 0) + data.get("stats", {}).get("unexpected", 0)
                passed = data.get("stats", {}).get("expected", 0)
                failed = data.get("stats", {}).get("unexpected", 0)
                duration_ms = data.get("stats", {}).get("duration", 0)

                summary = (
                    f"\n=== TEST EXECUTION SUMMARY ===\n"
                    f"Total tests: {total}\n"
                    f"Passed: {passed}\n"
                    f"Failed: {failed}\n"
                    f"Duration: {duration_ms / 1000:.2f}s\n"
                    f"Browser: {browser}\n"
                    f"Exit code: {exit_code}\n"
                )

                if failed > 0:
                    summary += "\n=== FAILURE DETAILS ===\n"
                    for suite in suites:
                        for spec in suite.get("specs", []):
                            if spec.get("status") == "unexpected":
                                title = spec.get("title", "unknown")
                                for test_result in spec.get("tests", []):
                                    for attempt in test_result.get("results", []):
                                        error = attempt.get("error", {}).get("message", "No error details")
                                        summary += f"\nTest: {title}\nError: {error}\n"
            except (json.JSONDecodeError, KeyError) as e:
                summary += f"\nCould not parse test results JSON: {e}\n"

        # Build full output
        output = summary or ""
        if not summary:
            output = (
                f"=== EXECUTION RESULT ===\n"
                f"Exit code: {exit_code}\n"
                f"Browser: {browser}\n"
            )

        if stdout.strip():
            output += f"\n--- stdout ---\n{stdout.strip()}"
        if stderr.strip():
            output += f"\n--- stderr ---\n{stderr.strip()}"

        return output
