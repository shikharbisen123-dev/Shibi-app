const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/checkAuth');
const Course = require('../model/Course');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const Student = require('../model/Student');
const Fee = require('../model/Fee');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

// ================= ADD COURSE =================
router.post('/add-course', checkAuth, (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, 'shi online classes 123');

    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: "Image is required" });
    }

    const file = req.files.image;

    cloudinary.uploader.upload_stream(
      { folder: "courses" },
      async (err, result) => {
        if (err) {
          return res.status(500).json({ error: err });
        }

        const newCourse = new Course({
          _id: new mongoose.Types.ObjectId(),
          courseName: req.body.courseName,
          price: req.body.price,
          description: req.body.description,
          startingDate: req.body.startingDate,
          endDate: req.body.endDate,
          uId: verify.uId,
          imageUrl: result.secure_url,
          imageId: result.public_id
        });

        const savedCourse = await newCourse.save();

        res.status(200).json({
          newCourse: savedCourse
        });
      }
    ).end(file.data);

  } catch (err) {
    res.status(500).json({ error: err });
  }
});


// ================= UPDATE COURSE =================
router.put('/:id', checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, 'shi online classes 123');

    const course = await Course.findById(req.params.id);

    if (!course || verify.uId != course.uId) {
      return res.status(403).json({ error: "Not allowed" });
    }

    let updatedData = {
      courseName: req.body.courseName,
      price: req.body.price,
      description: req.body.description,
      startingDate: req.body.startingDate,
      endDate: req.body.endDate,
      uId: verify.uId,
      imageUrl: course.imageUrl,
      imageId: course.imageId
    };

    // If new image uploaded
    if (req.files && req.files.image) {

      await cloudinary.uploader.destroy(course.imageId);

      const file = req.files.image;

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "courses" },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        ).end(file.data);
      });

      updatedData.imageUrl = uploadResult.secure_url;
      updatedData.imageId = uploadResult.public_id;
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    res.status(200).json({
      updatedCourse: updatedCourse
    });

  } catch (err) {
    res.status(500).json({ error: err });
  }
});


module.exports = router;
