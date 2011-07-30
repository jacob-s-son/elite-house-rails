class RenameImagesColumns < ActiveRecord::Migration
  def self.up
    rename_column :images, :image_file_name, :picture_file_name
    rename_column :images, :image_content_type, :picture_content_type
    rename_column :images, :image_file_size, :picture_file_size
    rename_column :images, :image_updated_at, :picture_updated_at
  end

  def self.down
    rename_column :images, :picture_file_name, :image_file_name
    rename_column :images, :picture_content_type, :image_content_type
    rename_column :images, :picture_file_size, :image_file_size
    rename_column :images, :picture_updated_at, :image_updated_at
  end
end
