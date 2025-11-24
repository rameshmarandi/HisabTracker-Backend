import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // console.log("Storage_destinatin", file);
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // console.log("at_Multer" , file)
    cb(null, file.originalname);
  },
});
export const upload = multer({ storage });
