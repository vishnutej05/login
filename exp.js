const express = require("express");
const fetch = require("node-fetch"); // Import node-fetch to make HTTP requests

const app = express();

// Define a route to fetch contest data
app.get("/contests", async (req, res) => {
  try {
    // Make a GET request to the API endpoint
    const response = await fetch("https://clist.by/api/v4/contest/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // You may need to add authentication headers if required by the API
        // 'Authorization': 'Bearer YourAuthToken',
      },
    });

    // Check if the request was successful
    if (!response.ok) {
      throw new Error("Failed to fetch contest data");
    }

    // Parse the JSON response
    const data = await response.json();

    // Send the contest data as the response
    res.json(data);
  } catch (error) {
    // Handle any errors that occur during the fetch operation
    console.error("Error fetching contest data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching contest data" });
  }
});

// Start the Express server
const port = 3000; // Choose any port you like
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
