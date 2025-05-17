export const handleFormChange = (setFormData) => (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: value
    }));
};

export const getErrorMessage = (error) => {
    return error.response?.data?.message || 'An error occurred';
}; 