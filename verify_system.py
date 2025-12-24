from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        try:
            print("Navigating to dashboard (expecting redirect)...")
            page.goto("http://localhost:3000/dashboard")
            # Wait for network idle or URL change
            try:
                page.wait_for_url("**/auth/login", timeout=5000)
            except:
                pass # Might already be there or different redirect

            print(f"Current URL: {page.url}")

            if "login" in page.url or page.locator("input[type='password']").count() > 0:
                print("Login page detected. Logging in...")
                page.fill("input[placeholder='Enter your username']", "admin")
                page.fill("input[type='password']", "admin")

                # Click Sign In
                page.click("button:has-text('Sign In')")

                print("Waiting for dashboard redirect...")
                page.wait_for_url("**/dashboard")
                print("Logged in successfully.")

            print("Waiting for dashboard content...")
            page.wait_for_selector("text=Executive Overview", timeout=10000)

            # Wait a bit for API to return data
            time.sleep(2)

            # Verify KPIs
            kpis = ["Total Sales", "Pending Orders", "Active Deliveries", "Total PO Value"]
            found_all = True
            for kpi in kpis:
                if page.locator(f"text={kpi}").count() > 0:
                    print(f"KPI '{kpi}' found.")
                else:
                    print(f"KPI '{kpi}' NOT found!")
                    found_all = False

            if found_all:
                print("SUCCESS: Dashboard verified.")
            else:
                print("FAILURE: Some KPIs missing.")

            # Take screenshot
            page.screenshot(path="dashboard_verified.png")
            print("Screenshot saved to dashboard_verified.png")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="dashboard_error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
