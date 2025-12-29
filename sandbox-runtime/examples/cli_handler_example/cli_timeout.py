import time


def handler(event):
    """
    Test handler with sleep to test timeout functionality
    """
    # Get sleep duration from event, default 5 seconds
    sleep_duration = event.get("__timeout", 5) + 100
    print(f"Starting handler, will sleep for {sleep_duration} seconds...")

    # Simulate work
    time.sleep(sleep_duration)

    print("Handler completed successfully!")
    return {
        "status": "success",
        "slept_for": sleep_duration,
        "message": "Handler completed",
    }
