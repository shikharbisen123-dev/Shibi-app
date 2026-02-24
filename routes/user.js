const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const User = require('../model/User');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

// ================= SIGNUP =================

router.post('/signup', async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(400).json({
                error: 'Email already registered'
            });
        }

        if (!req.files || !req.files.image) {
            return res.status(400).json({
                error: 'Image is required'
            });
        }

        const file = req.files.image;

        // 🔥 Upload using buffer (NO tempFilePath)
        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: "users" },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(file.data);
        });

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const newUser = new User({
            _id: new mongoose.Types.ObjectId(),
            fullName: req.body.fullName,
            email: req.body.email,
            phone: req.body.phone,
            password: hashedPassword,
            imageUrl: uploadResult.secure_url,
            imageId: uploadResult.public_id
        });

        const savedUser = await newUser.save();

        res.status(200).json({
            newUser: savedUser
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: error.message
        });
    }
});


// ================= LOGIN =================

router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(400).json({
                error: "Email not registered"
            });
        }

        const isMatch = await bcrypt.compare(req.body.password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                error: 'Password incorrect'
            });
        }

        const token = jwt.sign(
            {
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                uId: user._id
            },
            'shi online classes 123',
            { expiresIn: '365d' }
        );

        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            imageUrl: user.imageUrl,
            imageId: user.imageId,
            token: token
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;
