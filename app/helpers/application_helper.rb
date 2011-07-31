module ApplicationHelper
  def url_for_category(category)
    if category.sub_categories.size > 0
      sub_category_furniture_index_path( :sub_category_id => category.sub_categories.first )
    else
      category_furniture_index_path(:category_id => category)
    end
  end
  
  def sub_menu_items(category)
    category.sub_categories.map do |sc|
      {
        :key => sc.key,
        :name => sc.name,
        :url => sub_category_furniture_index_path( :sub_category_id => sc ),
        :options => { :container_id => "sub_menu" }
      }
    end
  end
  
  def menu_items
    Category.all.map do |category|
      {
        :name => category.name,
        :key => "main_#{category.id}".to_sym,
        :url => url_for_category(category),
        :options => { :container_id => 'main_menu' },
        :items => sub_menu_items(category)
      }
    end
  end
  
  def furniture_url(f)
    category_furniture_path(:id => f, :category_id => f.category)
  end
  
  def last_furniture_row
    ( @furniture.size.to_f / @furniture_per_row.to_f ).round.to_i 
  end
  
  def sliced_furniture_array(nr)
    nr -= 1
    @furniture.slice(nr*@furniture_per_row, @furniture_per_row)
  end
  
  def furniture_form_url
    @furniture.new_record? ? admin_furniture_index_path : admin_furniture_path
  end
end
