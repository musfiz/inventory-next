import apiClient from '@/lib/api/axios';
import type { ApiResponse, BlogPost, CreateBlogPostRequest } from '@/types/api.types';

class BlogPostService {
  async getAll(params?: { page?: number; per_page?: number; search?: string }) {
    const response = await apiClient.get<{
      data: BlogPost[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>('/api/v1/blog-posts', { params });
    return response.data;
  }

  async get(id: string): Promise<BlogPost> {
    const response = await apiClient.get<ApiResponse<{ post: BlogPost }>>(
      `/api/v1/blog-posts/${id}`
    );
    return response.data.data.post;
  }

  async create(data: CreateBlogPostRequest): Promise<BlogPost> {
    const response = await apiClient.post<ApiResponse<{ post: BlogPost }>>(
      '/api/v1/blog-posts',
      data
    );
    return response.data.data.post;
  }

  async update(id: string, data: Partial<CreateBlogPostRequest>): Promise<BlogPost> {
    const response = await apiClient.post<ApiResponse<{ post: BlogPost }>>(
      `/api/v1/blog-posts/${id}`,
      data
    );
    return response.data.data.post;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/blog-posts/${id}`);
  }

  async deleteImage(url: string): Promise<void> {
    await apiClient.post('/api/v1/blog-posts/delete-image', { url });
  }

  async togglePublish(id: string): Promise<BlogPost> {
    const response = await apiClient.patch<ApiResponse<{ post: BlogPost }>>(
      `/api/v1/blog-posts/${id}/toggle-publish`
    );
    return response.data.data.post;
  }

  async uploadImage(file: File, folderKey?: string): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    if (folderKey) {
      formData.append('folder_key', folderKey);
    }

    const response = await apiClient.post<{ success: boolean; url: string }>(
      '/api/v1/blog-posts/upload-image',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );

    return response.data.url;
  }
}

export default new BlogPostService();
