import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        type: "OAuth2",
        user: "lost.and.found.network.gb@gmail.com",
        accessToken: process.env.GOOGLE_ACCESS_TOKEN,
    },
});

export const sendEmail = async (address, subject, body) => {
    const mailOptions = {
        from: '"Lost & Found Network" <lost.and.found.network.gb@gmail.com>',
        to: address,
        subject: subject,
        html: body,
    };
    return await transporter.sendMail(mailOptions, (error, info) => {
        if (error) return console.log('Error:', error);
        else return 'Message sent: %s' + info.messageId;
    });
}