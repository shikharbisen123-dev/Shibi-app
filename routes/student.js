const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/checkAuth");
const Student = require("../model/Student");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const Fee = require("../model/Fee");
const Course = require("../model/Course");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// ================= ADD STUDENT =================
router.post("/add-student", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: "Image is required" });
    }

    const file = req.files.image;

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "students" }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        })
        .end(file.data);
    });

    const newStudent = new Student({
      _id: new mongoose.Types.ObjectId(),
      fullName: req.body.fullName,
      phone: req.body.phone,
      email: req.body.email,
      address: req.body.address,
      courseId: req.body.courseId,
      uId: verify.uId,
      imageUrl: uploadResult.secure_url,
      imageId: uploadResult.public_id,
    });

    const savedStudent = await newStudent.save();

    res.status(200).json({
      newStudent: savedStudent,
    });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// ================= UPDATE STUDENT =================
router.put("/:id", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    const student = await Student.findById(req.params.id);

    if (!student || verify.uId != student.uId) {
      return res.status(403).json({ error: "Not allowed" });
    }

    let updatedData = {
      fullName: req.body.fullName,
      phone: req.body.phone,
      email: req.body.email,
      address: req.body.address,
      courseId: req.body.courseId,
      uId: verify.uId,
      imageUrl: student.imageUrl,
      imageId: student.imageId,
    };

    if (req.files && req.files.image) {
      await cloudinary.uploader.destroy(student.imageId);

      const file = req.files.image;

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "students" }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          })
          .end(file.data);
      });

      updatedData.imageUrl = uploadResult.secure_url;
      updatedData.imageId = uploadResult.public_id;
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    res.status(200).json({
      updatedStudent: updatedStudent,
    });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});
