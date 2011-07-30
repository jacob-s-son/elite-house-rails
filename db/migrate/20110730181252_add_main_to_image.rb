class AddMainToImage < ActiveRecord::Migration
  def self.up
    add_column :images, :main, :boolean
  end

  def self.down
    remove_column :images, :main
  end
end
