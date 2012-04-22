class AddGalleryFlagToImage < ActiveRecord::Migration
  def self.up
    add_column :images, :gallery_flag, :boolean
  end

  def self.down
    remove_column :images, :gallery_flag
  end
end
