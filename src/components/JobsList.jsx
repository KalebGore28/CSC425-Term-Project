import React, { useEffect, useState } from 'react';
import axios from 'axios';

const JobsList = () => {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
	axios.get('http://localhost:5001/api/jobs')
	  .then(response => {
		setJobs(response.data.data);
	  })
	  .catch(error => {
		console.error('Error fetching jobs:', error);
	  });
  }, []);

  return (
	<div>
	  <h1>Jobs List</h1>
	  <ul>
		{jobs.map(job => (
		  <li key={job.id}>
			{job.title} - {job.description} (${job.salary})
		  </li>
		))}
	  </ul>
	</div>
  );
};

export default JobsList;