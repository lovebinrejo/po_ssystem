const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const loginUser = async ({ email, password, masterEntity }) => {
  const body = new URLSearchParams({
    login: email,
    password,
    entity: masterEntity || "1",
  });

  const response = await fetch(`${API_BASE_URL}/api/login/index.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const message = data?.message || "Invalid username or password";
    const error = new Error(message);
    error.response = { data: { message } };
    throw error;
  }

  const result = data.success;

  return {
    success: true,
    token: result.bearer_token,
    apiKey: result.api_key,
    user: {
      id: result.user_id,
      login: result.login,
      fullname: result.fullname,
      email: result.email,
      admin: result.admin,
      entity: result.entity,
    },
    terminalConfig: {
      terminalNumber: result.terminal_number,
      defaultCustomerId: result.default_customer_id,
      ...result.terminal_config,
    },
  };
};
