# oxevy-2.0-luncher
just compile it

## Microsoft account login

- Open **Account Manager** → **Sign In with Microsoft**.
- A browser window opens for device-code sign-in; once completed, the launcher uses your premium Minecraft profile automatically.

## Key sync (website key generator)

- The launcher verifies keys against a key server (default: `http://localhost:3030`).
- To sync with your website key generator backend, open **Settings → Key Server URL** and set it to the same host/port your generator uses, then click **Test Connection**.
- Sync flow: generate your key on the website first, then in the launcher enter the same nickname and it will fetch the key via `GET /api/key?nickname=...`.
- The launcher supports both nickname-bound keys and generic keys (generated without a nickname) during verification.

### Running the key server

- `cd website-old && node key-server.cjs`
