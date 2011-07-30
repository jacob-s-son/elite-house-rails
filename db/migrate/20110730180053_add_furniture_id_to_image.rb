class AddFurnitureIdToImage < ActiveRecord::Migration
  def self.up
    add_column :images, :furniture_id, :integer
  end

  def self.down
    remove_column :images, :furniture_id
  end
end
