const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary'); //  to set storage settings

cloudinary.config({
    api_key:process.env.api_key,
    api_secret:process.env.api_secret,
    cloud_name:process.env.cloud_name
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'userDp',
      allowed_formats:['jpg','jpeg','png']
    //   format: async (req, file) => 'png', // supports promises as well
    //   public_id: (req, file) => 'computed-filename-using-request',
    },
  });

  module.exports= {storage,cloudinary};