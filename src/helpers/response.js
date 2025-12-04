module.exports = {
  success(res, message = "Success", data = null, code = 200) {
     console.log(message, data);
    return res.status(code).json({
      status: true,
      message,
      data,
    });
  },

  error(res, message = "Terjadi kesalahan", data = null, code = 400) {
    console.log(message, data);
    
    return res.status(code).json({
      status: false,
      message,
      data,
    });
  },

  
  serverError(res, error) {
     console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
      data: null,
    });
  },
};
