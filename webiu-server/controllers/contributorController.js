require('dotenv').config();
const express = require('express');
const axios = require('axios');
const router = express.Router();
const port = process.env.PORT || 3000;
const baseUrl = 'https://api.github.com';
const accessToken = process.env.GITHUB_ACCESS_TOKEN;

const getAllContributors = async (req, res) => {
  try {
    let finalResponse = {};
    const orgName = 'c2siorg';
    const repositories = await fetchRepositories(orgName);
    console.log(repositories);
    

    if (!repositories) {
      return res.status(500).json({ error: 'Failed to fetch repositories' });
    }

    await Promise.all(
      repositories.map(async (repo) => {
        try {
          const contributors = await fetchContributors(orgName, repo.name);
          if (!contributors) return;

          await Promise.all(
            contributors.map(async (contributor) => {
              try {
                const userDetails = await fetchUserDetails(contributor.login);
                if (!userDetails) return;

                // Fetch issues and pull requests for each contributor
                const issues = await fetchUserCreatedIssues(userDetails.login);
                const pullRequests = await fetchUserCreatedPullRequests(userDetails.login);

                // If user is already in the response, update their data
                if (finalResponse[userDetails.login]) {
                  finalResponse[userDetails.login].repos.push(repo.name);
                  finalResponse[userDetails.login].issues = issues || [];
                  finalResponse[userDetails.login].pullRequests = pullRequests || [];
                } else {
                  // If user is not yet in the response, create their entry
                  finalResponse[userDetails.login] = {
                    login: userDetails.login,
                    contributions: contributor.contributions,
                    repos: [repo.name],
                    followers: userDetails.followers,
                    following: userDetails.following,
                    avatar_url: userDetails.avatar_url,
                    issues: issues || [], // Ensure issues field is always present
                    pullRequests: pullRequests || [] // Ensure pullRequests field is always present
                  };
                }
              } catch (err) {
                console.error('Error in fetching user details:', err);
              }
            })
          );
        } catch (err) {
          console.error('Error in fetching contributors:', err);
        }
      })
    );

    let allContributors = [];
    for (const contributor in finalResponse) {
      allContributors.push(finalResponse[contributor]);
    }

    return res.json(allContributors);
  } catch (error) {
    console.error('Error fetching organization info:', error);
    return res.status(500).json({ error: 'Failed to fetch organization info' });
  }
};

// Helper functions to fetch issues and pull requests
async function fetchUserCreatedIssues(username) {
  try {
    const issuesResponse = await axios.get(
      `${baseUrl}/search/issues?q=author:${username}+org:c2siorg+type:issue`,
      {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      }
    );
    return issuesResponse.data.items || []; // Return empty array if no issues found
  } catch (error) {
    console.error('Error fetching user-created issues:', error);
    return []; // Return empty array in case of error
  }
}

async function fetchUserCreatedPullRequests(username) {
  try {
    const pullRequestsResponse = await axios.get(
      `${baseUrl}/search/issues?q=author:${username}+org:c2siorg+type:pr`,
      {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      }
    );
    return pullRequestsResponse.data.items || []; // Return empty array if no PRs found
  } catch (error) {
    console.error('Error fetching user-created pull requests:', error);
    return []; // Return empty array in case of error
  }
}


async function fetchRepositories(orgName) {
  try {
    const response = await axios.get(`${baseUrl}/orgs/${orgName}/repos`, {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error in fetching repositories', error);
    return null;
  }
}

async function fetchContributors(orgName, repoName) {
  try {
    const response = await axios.get(`${baseUrl}/repos/${orgName}/${repoName}/contributors`, {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error in fetching contributors', error);
    return null;
  }
}

async function fetchUserDetails(username) {
  try {
    const response = await axios.get(`${baseUrl}/users/${username}`, {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });
    return {
      login: response.data.login,
      contributions: response.data.contributions,
      followers: response.data.followers,
      following: response.data.following,
      avatar_url: response.data.avatar_url
    };
  } catch (error) {
    console.error('Error in fetching contributor details', error);
    return null;
  }
}


const userCreatedIssues = async (req, res) => {
  try {
    const orgName = 'c2siorg';
    const { username } = req.params;

    const issuesResponse = await axios.get(
      `${baseUrl}/search/issues?q=author:${username}+org:${orgName}+type:issue`,
      {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      }
    );

    const issues = issuesResponse.data.items;

    if (!issues) {
      return res.status(500).json({ error: 'Failed to fetch user-created issues' });
    }

    return res.status(200).json({ issues });
  } catch (error) {
    console.error('Error fetching user created issues:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const userCreatedPullRequests = async (req, res) => {
  try {
    const orgName = 'c2siorg';
    const { username } = req.params;

    const pullRequestsResponse = await axios.get(
      `${baseUrl}/search/issues?q=author:${username}+org:${orgName}+type:pr`,
      {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      }
    );

    const pullRequests = pullRequestsResponse.data.items;

    if (!pullRequests) {
      return res.status(500).json({ error: 'Failed to fetch user-created pull requests' });
    }

    return res.status(200).json({ pullRequests });
  } catch (error) {
    console.error('Error fetching user created pull requests:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllContributors,
  userCreatedIssues,
  userCreatedPullRequests,
};
