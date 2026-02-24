const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/checkAuth");
const Course = require("../model/Course");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const Student = require("../model/Student");
const Fee = require("../model/Fee");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// ================= ADD COURSE =================

router.post("/add-course", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: "Image is required" });
    }

    const file = req.files.image;

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "courses" }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        })
        .end(file.data);
    });

    const newCourse = new Course({
      _id: new mongoose.Types.ObjectId(),
      courseName: req.body.courseName,
      price: req.body.price,
      description: req.body.description,
      startingDate: req.body.startingDate,
      endDate: req.body.endDate,
      uId: verify.uId,
      imageUrl: uploadResult.secure_url,
      imageId: uploadResult.public_id,
    });

    const savedCourse = await newCourse.save();

    res.status(200).json({ newCourse: savedCourse });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

// ================= ALL COURSES =================

router.get("/all-courses", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    const courses = await Course.find({ uId: verify.uId });

    res.status(200).json({ courses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= COURSE DETAIL =================

router.get("/course-detail/:id", checkAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    const students = await Student.find({ courseId: req.params.id });

    res.status(200).json({
      course,
      studentList: students,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= DELETE COURSE =================

router.delete("/:id", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (course.uId != verify.uId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await cloudinary.uploader.destroy(course.imageId);
    await Student.deleteMany({ courseId: req.params.id });
    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= UPDATE COURSE =================

router.put("/:id", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (course.uId != verify.uId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    let imageUrl = course.imageUrl;
    let imageId = course.imageId;

    if (req.files && req.files.image) {
      await cloudinary.uploader.destroy(course.imageId);

      const file = req.files.image;

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "courses" }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          })
          .end(file.data);
      });

      imageUrl = uploadResult.secure_url;
      imageId = uploadResult.public_id;
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      {
        courseName: req.body.courseName,
        price: req.body.price,
        description: req.body.description,
        startingDate: req.body.startingDate,
        endDate: req.body.endDate,
        imageUrl,
        imageId,
      },
      { new: true }
    );

    res.status(200).json({ updatedCourse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= LATEST COURSES =================

router.get("/latest-courses", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    const courses = await Course.find({ uId: verify.uId })
      .sort({ _id: -1 })
      .limit(5);

    res.status(200).json({ courses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= HOME DASHBOARD =================

router.get("/home", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verify = jwt.verify(token, "shi online classes 123");

    const newFees = await Fee.find({ uId: verify.uId })
      .sort({ _id: -1 })
      .limit(5);

    const newStudents = await Student.find({ uId: verify.uId })
      .sort({ _id: -1 })
      .limit(5);

    const totalCourse = await Course.countDocuments({ uId: verify.uId });
    const totalStudent = await Student.countDocuments({ uId: verify.uId });

    const totalAmount = await Fee.aggregate([
      { $match: { uId: verify.uId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json({
      fees: newFees,
      students: newStudents,
      totalCourse,
      totalStudent,
      totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
