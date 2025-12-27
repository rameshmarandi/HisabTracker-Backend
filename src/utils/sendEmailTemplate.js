import { sendEmail } from "./sendEmail.js";

export const sendEmailTemplate = async ({
  email,
  subject,
  title,
  message,
  otp,
  userName,
  buttonText,
  buttonLink,
  footerMessage,
  logoUrl = "https://res.cloudinary.com/dmqlnxdes/image/upload/v1766863322/hisabTrackerLogo_owvkou.png",
}) => {
  const mailOptions = {
    from: `"Hisab Tracker App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">

        <table width="100%" style="max-width:480px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 6px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding:24px; text-align:center;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="Hisab Tracker" width="64" height="64" style="margin-bottom:12px; border-radius:12px;" />`
                  : ""
              }
              <h1 style="margin:0; font-size:20px; color:#111827;">
                Hisab Tracker
              </h1>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 24px;">
              <hr style="border:none; border-top:1px solid #e5e7eb;" />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:24px; color:#111827;">
              <p style="margin:0 0 12px; font-size:15px;">
                Hello <strong>${userName || "there"}</strong>,
              </p>

              <p style="margin:0 0 16px; font-size:14px; color:#374151;">
                ${message || "Use the verification code below to complete your request."}
              </p>

              ${
                otp
                  ? `
                  <div style="margin:28px 0; text-align:center;">
                    <div style="
                      font-size:30px;
                      letter-spacing:8px;
                      font-weight:700;
                      color:#1d4ed8;
                      background:#eff6ff;
                      display:inline-block;
                      padding:14px 28px;
                      border-radius:10px;
                    ">
                      ${otp}
                    </div>
                    <p style="margin-top:10px; font-size:12px; color:#6b7280;">
                      This code expires in 5 minutes.
                    </p>
                  </div>
                `
                  : ""
              }

              ${
                buttonText && buttonLink
                  ? `
                  <div style="text-align:center; margin:24px 0;">
                    <a href="${buttonLink}" target="_blank"
                      style="
                        background:#1d4ed8;
                        color:#ffffff;
                        text-decoration:none;
                        padding:12px 26px;
                        border-radius:10px;
                        font-size:14px;
                        display:inline-block;
                      ">
                      ${buttonText}
                    </a>
                  </div>
                `
                  : ""
              }

              <p style="margin:24px 0 0; font-size:13px; color:#6b7280;">
                If you did not request this verification, please ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb; padding:16px; text-align:center; font-size:12px; color:#9ca3af;">
              ${footerMessage || `© ${new Date().getFullYear()} Hisab Tracker. All rights reserved.`}
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`,

    //     html: `
    // <!DOCTYPE html>
    // <html>
    // <head>
    //   <meta charset="UTF-8" />
    //   <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    //   <title>${subject}</title>
    // </head>
    // <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
    //   <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:20px 0;">
    //     <tr>
    //       <td align="center">
    //         <table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

    //           <!-- Header -->
    //           <tr>
    //             <td style="background:#1f2937; padding:20px; text-align:center;">
    //               <h1 style="color:#ffffff; margin:0; font-size:20px;">Hisab Tracker App</h1>
    //             </td>
    //           </tr>

    //           <!-- Content -->
    //           <tr>
    //             <td style="padding:24px; color:#111827;">
    //               <p style="margin:0 0 12px; font-size:15px;">
    //                 Hi <strong>${userName || "there"}</strong>,
    //               </p>

    //               <h2 style="margin:0 0 12px; font-size:18px; color:#111827;">
    //                 ${title}
    //               </h2>

    //               ${
    //                 message
    //                   ? `<p style="margin:0 0 16px; font-size:14px; color:#374151;">
    //                       ${message}
    //                     </p>`
    //                   : ""
    //               }

    //               ${
    //                 otp
    //                   ? `
    //                   <div style="margin:24px 0; text-align:center;">
    //                     <div style="font-size:28px; letter-spacing:6px; font-weight:700; color:#2563eb; background:#eef2ff; display:inline-block; padding:12px 20px; border-radius:8px;">
    //                       ${otp}
    //                     </div>
    //                     <p style="margin-top:12px; font-size:12px; color:#6b7280;">
    //                       This code is valid for 5 minutes.
    //                     </p>
    //                   </div>
    //                 `
    //                   : ""
    //               }

    //               ${
    //                 buttonText && buttonLink
    //                   ? `
    //                   <div style="text-align:center; margin:24px 0;">
    //                     <a href="${buttonLink}" target="_blank"
    //                        style="background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:8px; font-size:14px; display:inline-block;">
    //                       ${buttonText}
    //                     </a>
    //                   </div>
    //                 `
    //                   : ""
    //               }

    //               <p style="margin:24px 0 0; font-size:13px; color:#6b7280;">
    //                 If you did not request this, you can safely ignore this email.
    //               </p>
    //             </td>
    //           </tr>

    //           <!-- Footer -->
    //           <tr>
    //             <td style="background:#f9fafb; padding:16px; text-align:center; font-size:12px; color:#9ca3af;">
    //               ${footerMessage || "© " + new Date().getFullYear() + " Hisab Tracker App. All rights reserved."}
    //             </td>
    //           </tr>

    //         </table>
    //       </td>
    //     </tr>
    //   </table>
    // </body>
    // </html>
    //     `,
  };

  return await sendEmail(mailOptions);
};
