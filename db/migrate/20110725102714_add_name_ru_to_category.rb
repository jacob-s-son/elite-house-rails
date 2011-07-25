class AddNameRuToCategory < ActiveRecord::Migration
  def self.up
    add_column :categories, :name_ru, :string
  end

  def self.down
    remove_column :categories, :name_ru
  end
end
