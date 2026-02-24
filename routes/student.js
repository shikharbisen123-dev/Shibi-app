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

    // 🔥 Upload using buffer (NO tempFilePath)
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
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

// ================= GET ALL STUDENTS =================

router.get("/all-students", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    const students = await Student.find({ uId: verify.uId })
      .select("_id uId fullName phone email address courseId imageUrl imageId");

    res.status(200).json({ students });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= STUDENT DETAIL =================

router.get("/student-detail/:id", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const feeData = await Fee.find({
      uId: verify.uId,
      courseId: student.courseId,
      phone: student.phone,
    });

    const courseDetail = await Course.findById(student.courseId);

    res.status(200).json({
      studentDetail: student,
      feeDetail: feeData,
      courseDetail: courseDetail,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= GET STUDENTS BY COURSE =================

router.get("/all-students/:courseId", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    const students = await Student.find({
      uId: verify.uId,
      courseId: req.params.courseId,
    });

    res.status(200).json({ students });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= DELETE STUDENT =================

router.delete("/:id", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (student.uId != verify.uId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await cloudinary.uploader.destroy(student.imageId);
    await Student.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= UPDATE STUDENT =================

router.put("/:id", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (student.uId != verify.uId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    let imageUrl = student.imageUrl;
    let imageId = student.imageId;

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

      imageUrl = uploadResult.secure_url;
      imageId = uploadResult.public_id;
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      {
        fullName: req.body.fullName,
        phone: req.body.phone,
        email: req.body.email,
        address: req.body.address,
        courseId: req.body.courseId,
        imageUrl,
        imageId,
      },
      { new: true }
    );

    res.status(200).json({ updatedStudent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= LATEST STUDENTS =================

router.get("/latest-students", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    const students = await Student.find({ uId: verify.uId })
      .sort({ _id: -1 })
      .limit(5);

    res.status(200).json({ students });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
