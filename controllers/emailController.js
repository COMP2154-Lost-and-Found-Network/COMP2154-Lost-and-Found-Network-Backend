import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        type: "OAuth2",
        user: process.env.GMAIL_USER || "lost.and.found.network.gb@gmail.com",
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    },
});

export const sendEmail = async (address, subject, body) => {
    const mailOptions = {
        from: '"Lost & Found Network" <lost.and.found.network.gb@gmail.com>',
        to: address,
        subject: subject,
        html: body,
    };
    const info = await transporter.sendMail(mailOptions);
    return info;
}