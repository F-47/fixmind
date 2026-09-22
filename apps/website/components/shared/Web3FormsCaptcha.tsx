"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";

const WEB3FORMS_FREE_SITE_KEY = "50b2fe65-b00b-4b9e-ad62-3ba471098be2";

export function Web3FormsCaptcha({
  onStatusChange,
}: {
  onStatusChange: (verified: boolean) => void;
}) {
  return (
    <div className="min-h-[78px] overflow-x-auto rounded-md">
      <HCaptcha
        sitekey={WEB3FORMS_FREE_SITE_KEY}
        theme="dark"
        reCaptchaCompat={false}
        onVerify={() => onStatusChange(true)}
        onExpire={() => onStatusChange(false)}
        onError={() => onStatusChange(false)}
      />
    </div>
  );
}
