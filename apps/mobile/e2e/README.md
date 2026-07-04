# Mobile E2E

These flows target the custom Expo native build, not Expo Go.

Run the manual header and keyboard coverage after installing a native build and starting the app's Metro bundle:

```bash
cd apps/mobile
pnpm run e2e:manual-header-keyboard
```

The default flow app id is `com.salemkode.agent`, which is shared by the checked-in iOS bundle identifier and Android application id.
On a signed-out simulator, the flow signs in with the demo account first; the configured Convex deployment must have dev mobile sign-in enabled for that step to complete.
