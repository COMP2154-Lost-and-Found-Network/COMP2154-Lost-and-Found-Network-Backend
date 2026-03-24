import nodemailer from "nodemailer";
import {findById as findUser} from "../models/userModel.js";
import {findById as findItem} from "../models/itemModel.js";

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

export const notifyUsersOfApproval = async (user_id, claimant_id, item_id) => {
    const user = await findUser(user_id);
    const claimant = await findUser(claimant_id);
    const item = await findItem(item_id);
    const user_message = `
        <p>Hello ${user.first_name}</p>
        <p>We are reaching out to you regarding your found item, ${item.title}.</p>
        <p>It has been flagged in our system as having an approved claim</p>
        <p>You can contact the owner of the item at ${claimant.email}</p>
    `;
    await sendEmail(user.email,"Found Item Claim Approved", user_message);
    const claimant_message = `
        <p>Hello ${claimant.first_name}</p>
        <p>We are reaching out to you regarding your lost item, ${item.title}.</p>
        <p>Your claim to this item has been flagged as approved</p>
        <p>You can contact the finder of the item at ${user.email}</p>
    `;
    await sendEmail(claimant.email,"Lost Item Claim Approved", claimant_message);
}