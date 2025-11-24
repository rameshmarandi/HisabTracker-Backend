import moment from "moment";

import { sendEmail } from "./sendEmail.js";
import { User } from "../models/User/Auth/user.model.js";
// import { User, Roles } from "../models/User/user.model.js";

export const getFirstName = (fullName) => {
  if (!fullName || typeof fullName !== "string") return "";
  return fullName.split(" ")[0];
};

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
}) => {
  console.log("EMAIL_PAsrs_at_temp", email);
  const mailOptions = {
    from: `"Kaamsathi" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    html: `
        <h1>${userName}</h1>
        <h1>${title}</h1>

      
      `,
  };

  const res = await sendEmail(email, mailOptions); // Assumed sendEmail is your email sending function
  return res;
};

export const sendDeletedUserEmailToSuperAdmins = async (
  branchAdmin,
  deletedUser
) => {
  // Fetch all super admins
  const superAdmins = await User.find({ role: Roles.SUPER_ADMIN });

  const message = `
      <p>Please be informed that the user with the following details was deleted by a branch admin:</p>
    
    <table style="border-collapse: collapse; width: 100%;">
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Branch Admin Name:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${branchAdmin.fullName}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Branch Admin ID:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${branchAdmin._id}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Branch Name:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${branchAdmin.branchName}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Branch ID:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${branchAdmin.churchBranchID}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Deleted User Name:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${deletedUser.fullName}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Deleted User ID:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${deletedUser._id}</td>
      </tr>
    </table>
    `;

  // Send an email to each super admin
  for (const superAdmin of superAdmins) {
    const firstName = getFirstName(superAdmin.fullName);
    await sendEmailTemplate({
      email: superAdmin.email,
      userName: firstName,
      subject: "User Deletion Notification",
      title: "User Deletion Notification",
      message: message,
    });
  }
};

// Notify super admins
export const notifySuperAdminsOnDailyVerse = async (
  performedBy,
  dailyVerse
) => {
  try {
    const superAdmins = await User.find({ role: Roles.SUPER_ADMIN });

    superAdmins.forEach(async (admin) => {
      const message = `
        <p>
          This is to inform you that the Digital Team has successfully <strong>published</strong> the daily verse for 
          <strong>${moment(dailyVerse.scheduleDate).format("DD MMMM YYYY")}</strong>.
        </p>
        <p>
          <strong>Action Taken:</strong> Published<br>
          <strong>Action Date:</strong> ${moment().format("DD MMMM YYYY")}<br>
          <strong>Performed By:</strong> ${performedBy} (Digital Team)
        </p>
        <p>Please be informed that any changes made to the daily verse have been processed by the Digital Team.</p>
        <p>Should you need any further information, feel free to reach out.</p>
      `;

      sendEmailTemplate({
        email: admin.email,
        userName: admin.fullName,
        subject: "Daily Verse Actioned by Digital Team",
        title: "Daily Verse Published",
        message,
      }).catch((err) =>
        console.error(`Error sending email to ${admin.email}:`, err)
      );
    });
  } catch (error) {
    console.error("Error notifying super admins:", error);
  }
};
