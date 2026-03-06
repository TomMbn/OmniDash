# Withings API - Integration Guide

You are integrating the Withings API via a Supabase Edge Function (Deno) and a Vue 3 frontend.

## 1. Authentication (OAuth 2.0 Flow)
- **Step 1 (Frontend)**: Redirect user to authorize URL.
  - URL: `https://account.withings.com/oauth2_user/authorize2`
  - Query params: `response_type=code`, `client_id`, `state` (random string), `scope=user.metrics`, `redirect_uri` (must match exactly the one in Withings portal).
- **Step 2 (Frontend to Edge Function)**: Once redirected back to `redirect_uri?code=XYZ`, send this `code` to the Supabase Edge Function.
- **Step 3 (Edge Function)**: Exchange the `code` for an `access_token`.
  - URL: `https://wbsapi.withings.net/v2/oauth2`
  - Method: POST
  - Body format: `application/x-www-form-urlencoded`
  - Body params: `action=requesttoken`, `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, `redirect_uri`.
  - The response will contain `access_token` and `refresh_token`.

## 2. Fetching Sleep Data (Sleep Analyzer)
Once the Edge Function has the `access_token`, it must fetch the sleep data.
- **URL**: `https://wbsapi.withings.net/v2/sleep`
- **Method**: POST
- **Headers**: `Authorization: Bearer <access_token>`
- **Body format**: `application/x-www-form-urlencoded`
- **Body params**: `action=getsummary`, `startdateymd=YYYY-MM-DD` (yesterday's date), `enddateymd=YYYY-MM-DD` (today's date).
- **Important**: The API returns data wrapped in a specific structure. The sleep score is inside `body.series[0].data.sleep_score`.
  Example Response:
  {
    "status": 0,
    "body": {
      "series": [
        {
          "date": "2023-10-25",
          "data": {
            "deepsleepduration": 15000,
            "remsleepduration": 8000,
            "wakeupduration": 500,
            "sleep_score": 85
          }
        }
      ]
    }
  }