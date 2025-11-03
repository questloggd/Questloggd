document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault(); // prevents the page from refreshing

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const response = await fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const result = await response.json();
  console.log(result);
});
