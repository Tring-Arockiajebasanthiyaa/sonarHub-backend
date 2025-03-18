import nodemailer from "nodemailer";

export const sendEmail = async (to: string, subject: string, text: string) => {
  const adminEmail = process.env.EMAIL_USER; // Your email (admin)

  if (!to) {
    console.error("No recipient email provided.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: adminEmail, // Your email
    },
  });

  const mailOptions = {
    from: adminEmail,
    to: [to, adminEmail].join(","), // Send to both user & admin
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to} and Admin (${adminEmail})`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

export default sendEmail;
