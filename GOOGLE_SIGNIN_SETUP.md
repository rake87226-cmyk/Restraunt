# Google Sign-In Setup Guide

## Overview
This guide explains how to set up Google Sign-In authentication for La Bella Restaurant's login page.

## Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com
   - Create a new project or select an existing one

2. **Enable Google+ API:**
   - Search for "Google+ API" in the search bar
   - Enable it for your project

3. **Create OAuth 2.0 Credentials:**
   - Go to "Credentials" in the left menu
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add Authorized JavaScript Origins:
     - `http://localhost:3000` (for development)
     - `http://localhost` (if needed)
     - Your production domain (e.g., `https://labella.com`)
   - Add Authorized Redirect URIs:
     - `http://localhost:3000/login.html`
     - Your production login page URL
   - Click "Create"
   - Copy your Client ID

4. **Note the Client ID:**
   - Save the Client ID in a safe place
   - Format: `XXXXXXXXXXXXXXXX.apps.googleusercontent.com`

## Step 2: Configure Your Application

1. **Update login.html:**
   - Open: `login.html`
   - Find the line with `data-client_id="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"`
   - Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID
   - Example:
     ```html
     data-client_id="123456789.apps.googleusercontent.com"
     ```

2. **Update login.js:**
   - Open: `login.js`
   - Find the `initializeGoogleSignIn()` function
   - Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID
   - Example:
     ```javascript
     client_id: '123456789.apps.googleusercontent.com',
     ```

## Step 3: Install Required Node Packages

```bash
cd backend
npm install jsonwebtoken
```

## Step 4: Test Google Sign-In

1. **Start your server:**
   ```bash
   cd backend
   node init_db.js
   node server.js
   ```

2. **Open login page:**
   - Visit: `http://localhost:3000/login.html`
   - You should see the Google Sign-In button under "or use social"

3. **Test the flow:**
   - Click the Google Sign-In button
   - Sign in with your Google account
   - You should be redirected to `index.html`
   - Your email should display in the navbar

## Security Notes

⚠️ **Important for Production:**

1. **JWT Verification:**
   - The current implementation decodes JWT without full verification
   - In production, verify the JWT signature using Google's public keys
   - Install `google-auth-library`:
     ```bash
     npm install google-auth-library
     ```
   - Update server.js to verify tokens properly

2. **HTTPS:**
   - Always use HTTPS in production
   - Google OAuth requires secure connections

3. **Environment Variables:**
   - Store your Client ID in `.env` file:
     ```
     GOOGLE_CLIENT_ID=your_client_id_here
     ```
   - Update code to use: `process.env.GOOGLE_CLIENT_ID`

## Troubleshooting

### Google button not appearing
- Check that Google Client ID is set correctly
- Check browser console for errors
- Ensure Google Identity Services script is loaded

### Sign-In fails with "Invalid token"
- Verify Client ID is correct
- Check that your domain/localhost is in Authorized JavaScript Origins
- Check server logs for error details

### User not created in database
- Check that `users` table exists: `node init_db.js`
- Check backend logs for database errors
- Verify user email is in Google token

## API Endpoints

### POST `/api/auth/google-signin`
- **Description:** Verify Google token and create user session
- **Body:**
  ```json
  {
    "googleToken": "jwt_token_from_google"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "token": "session_token",
    "email": "user@gmail.com",
    "name": "User Name",
    "userId": 1
  }
  ```

## Files Modified

1. **login.html** - Added Google Sign-In button
2. **login.css** - Styled Google Sign-In button
3. **login.js** - Added Google OAuth callback handler
4. **server.js** - Added `/api/auth/google-signin` endpoint

## Additional Resources

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [JWT Documentation](https://jwt.io/)
