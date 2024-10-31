import React, { useEffect, useState } from 'react';
import axios from 'axios';

const UsersList = () => {
	const [users, setUsers] = useState([]);

	useEffect(() => {
		axios.get('http://localhost:5001/api/users')
			.then(response => {
				setUsers(response.data.data);
			})
			.catch(error => {
				console.error('Error fetching users:', error);
			});
	}, []);

	return (
		<div>
			<h1>User List</h1>
			<ul>
				{
					users.map(user => (
						<li key={user.user_id}>
							{user.name}
						</li>
					))
				}
			</ul>
		</div>
	);
};

export default UsersList;