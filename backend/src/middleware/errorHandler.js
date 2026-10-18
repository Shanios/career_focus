export function createErrorHandler() {
  return (error, _req, res, _next) => {
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ success: false, error: { message: 'Request body must contain valid JSON.' } });
    }

    const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
    if (status >= 500) {
      console.error('Request failed:', { name: error?.name || 'Error', code: error?.code });
    }
    const message = status === 500 ? 'An unexpected server error occurred.' : error.message;
    return res.status(status).json({ success: false, error: { message } });
  };
}
