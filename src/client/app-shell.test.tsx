import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthScreen } from "./auth-screen.js";

test("React auth screen renders accessible RHF forms with development credentials", () => {
  const html = renderToStaticMarkup(
    <AuthScreen
      devLoginCredentials={{
        email: "admin@otter.local",
        password: "admin1234",
      }}
      onLogin={async () => undefined}
      onRegister={async () => undefined}
    />,
  );

  assert.match(html, /<form[^>]*id="login-form"/);
  assert.match(html, /<label[^>]*for="login-email"[^>]*>Email<\/label>/);
  assert.match(html, /value="admin@otter\.local"/);
  assert.match(html, /<form[^>]*id="register-form"/);
  assert.match(html, /data-slot="button"/);
});
