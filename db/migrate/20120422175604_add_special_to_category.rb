class AddSpecialToCategory < ActiveRecord::Migration
  def self.up
    add_column :categories, :special, :boolean
  end

  def self.down
    remove_column :categories, :special
  end
end
