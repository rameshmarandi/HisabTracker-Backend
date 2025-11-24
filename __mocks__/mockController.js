export const mockSuccessController = async (req, res) => {
  res.status(200).json({ success: true, message: 'Success!' });
};

export const mockFailureController = async (req, res) => {
    throw new Error('Simulated Failure');
  };
