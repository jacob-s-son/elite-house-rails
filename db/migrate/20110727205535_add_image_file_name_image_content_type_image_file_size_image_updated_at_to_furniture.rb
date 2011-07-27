class AddImageFileNameImageContentTypeImageFileSizeImageUpdatedAtToFurniture < ActiveRecord::Migration
  def self.up
    add_column :furnitures, :image_file_name, :string
    add_column :furnitures, :image_content_type, :string
    add_column :furnitures, :image_file_size, :integer
    add_column :furnitures, :image_updated_at, :datetime
  end

  def self.down
    remove_column :furnitures, :image_updated_at
    remove_column :furnitures, :image_file_size
    remove_column :furnitures, :image_content_type
    remove_column :furnitures, :image_file_name
  end
end
