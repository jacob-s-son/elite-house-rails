class RemoveImageFileNameImageContentTypeImageFileSizeImageUpdatedAt < ActiveRecord::Migration
  def self.up
    remove_column :furnitures, :image_file_name
    remove_column :furnitures, :image_content_type
    remove_column :furnitures, :image_file_size
    remove_column :furnitures, :image_updated_at
  end

  def self.down
    add_column :furnitures, :image_file_name, :string
    add_column :furnitures, :image_content_type, :string
    add_column :furnitures, :image_file_size, :integer
    add_column :furnitures, :image_updated_at, :datetime
  end
end
