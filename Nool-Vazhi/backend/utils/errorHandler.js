const handleError = (res, err) => {
  let status = 500;
  let message = err.message || 'Internal Server Error';
  
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    status = 409;
    message = 'Duplicate field value entered';
  }

  // Prevent leaking raw MongoDB queries or stack traces in production
  if (status === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal Server Error';
  }

  console.error(`[API Error] ${status} - ${err.message}`);
  res.status(status).json({ message });
};

module.exports = { handleError };
